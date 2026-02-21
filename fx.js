(function() {
  'use strict';

  var fxapi_token = Lampa.Storage.get('fxapi_token', '');
  var unic_id = Lampa.Storage.get('fxapi_uid', '');
  if (!unic_id) {
    unic_id = Lampa.Utils.uid(16);
    Lampa.Storage.set('fxapi_uid', unic_id);
  }

  var api_url = 'https://filmixapp.vip/api/v2/';
  var dev_token =
    'user_dev_apk=2.0.1' +
    '&user_dev_id=' + unic_id +
    '&user_dev_name=Lampa' +
    '&user_dev_os=11' +
    '&user_dev_vendor=FXAPI' +
    '&user_dev_token=';

  function fxapi(component, _object) {
    var network = new Lampa.Reguest();
    var results = [];
    var choice = {
      season: 0,
      voice: 0,
      voice_name: ''
    };

    function getVoices() {
      var voices = [];
      if (results.player_links && results.player_links.voice) {
        results.player_links.voice.forEach(function(voice) {
          voices.push({
            title: voice.title,
            index: voice.index
          });
        });
      }
      return voices;
    }

    function getSeasons() {
      var seasons = [];
      if (results.player_links && results.player_links.season) {
        results.player_links.season.forEach(function(season) {
          seasons.push({
            title: 'Сезон ' + season.season,
            index: season.index
          });
        });
      }
      return seasons;
    }

    function getEpisodes() {
      var episodes = [];
      if (
        results.player_links &&
        results.player_links.season &&
        results.player_links.season[choice.season] &&
        results.player_links.season[choice.season].episodes
      ) {
        results.player_links.season[choice.season].episodes.forEach(function(ep) {
          episodes.push({
            title: ep.episode + ' серия',
            index: ep.index
          });
        });
      }
      return episodes;
    }

    function getLinks() {
      var links = [];
      if (
        results.player_links &&
        results.player_links.season &&
        results.player_links.season[choice.season] &&
        results.player_links.season[choice.season].episodes &&
        results.player_links.season[choice.season].episodes[choice.episode] &&
        results.player_links.season[choice.season].episodes[choice.episode].links
      ) {
        var ep =
          results.player_links.season[choice.season].episodes[choice.episode];
        if (ep.links[choice.voice]) {
          ep.links[choice.voice].forEach(function(link) {
            links.push(link);
          });
        }
      }
      return links;
    }

    this.searchByTitle = function(_object, query) {
      var year = parseInt(
        (_object.movie.release_date ||
          _object.movie.first_air_date ||
          '0000'
        ).slice(0, 4)
      );

      var url = api_url;
      url = Lampa.Utils.addUrlComponent(
        url,
        'search?story=' + encodeURIComponent(query)
      );
      url = Lampa.Utils.addUrlComponent(url, dev_token + fxapi_token);

      network.clear();
      network.silent(
        url,
        function(json) {
          if (json && json.length) {
            component.loading(false);
            component.similars(json);
          } else {
            component.doesNotAnswer();
          }
        },
        function() {
          component.doesNotAnswer();
        }
      );
    };

    this.find = function(filmix_id) {
      var url = api_url;  
      end_search(filmix_id);

      function end_search(filmix_id) {
        network.clear();
        network.timeout(10000);
        network.silent(
          url + 'post/' + filmix_id + '?' + dev_token + fxapi_token,
          function(json) {
            if (json && json.player_links) {
              results = json;
              component.loading(false);
              component.renderData();
            } else {
              component.doesNotAnswer();
            }
          },
          function() {
            component.doesNotAnswer();
          }
        );
      }
    };

    this.getVoices = getVoices;
    this.getSeasons = getSeasons;
    this.getEpisodes = getEpisodes;
    this.getLinks = getLinks;

    this.destroy = function() {
      network.clear();
    };
  }

  function component(object) {
    var source;
    var scroll;
    var body;

    this.initialize = function() {
      source = new fxapi(this, object);
      this.search();
    };

    this.search = function() {
      this.activity.loader(true);
      source.searchByTitle(
        object,
        object.movie.original_title || object.movie.title
      );
    };

    this.similars = function(items) {
      body.empty();
      items.forEach(function(item) {
        var el = $('<div class="selector">' + (item.title || item.ru_title) + '</div>');
        el.on('hover:enter', function() {
          this.activity.loader(true);
          source.find(item.id);
        }.bind(this));
        body.append(el);
      }.bind(this));
    };

    this.renderData = function() {
      body.empty();

      var voices = source.getVoices();
      var seasons = source.getSeasons();
      var episodes = source.getEpisodes();
      var links = source.getLinks();

      body.append('<div>Озвучки: ' + voices.length + '</div>');
      body.append('<div>Сезоны: ' + seasons.length + '</div>');
      body.append('<div>Серии: ' + episodes.length + '</div>');
      body.append('<div>Ссылки: ' + links.length + '</div>');
    };

    this.render = function() {
      if (!body) {
        body = $('<div class="fxapi"></div>');
      }
      return body;
    };

    this.loading = function(v) {
      this.activity.loader(v);
    };

    this.doesNotAnswer = function() {
      this.loading(false);
      Lampa.Noty.show('Filmix не відповив');
    };
  }

  Lampa.Component.add('online_fxapi', component);
})();
